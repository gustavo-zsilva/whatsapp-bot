import { Client, LocalAuth, Message } from 'whatsapp-web.js'
import qrcode from 'qrcode-terminal'
require('dotenv').config()

const client = new Client({ authStrategy: new LocalAuth(), webVersionCache: {
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2409.0-beta.html',
    type: 'remote',
} });

type MenuItem = {
    name: string,
    price: number,
}

type OngoingChats = string[]

let menu: MenuItem[] = []

interface Orders {
    [chatId: string]: {
        name: string,
        price: number,
    }[]
}

async function getMenu() {
    try {
        const data = await fetch('https://vargas-barbearia.vercel.app/api')
        const rawMenu = await data.json() as string
        menu = JSON.parse(rawMenu)
        
    } catch (err) {
        console.error(err)
    }
}

async function getContactData(msg: Message) {
    const contactData = await msg.getContact()
    const shortname = contactData.shortName

    return { shortname }
}

const ongoingChats: OngoingChats = []
const orders: Orders = {}

function handleSendMenu(chatId: string) {
    // Fetch menu from an api
    let textMenu = ''
    menu.forEach((menuItem, index) => textMenu += `${index + 1}. ${menuItem.name} - *${menuItem.price}R$*\n`)

    client.sendMessage(chatId, `${textMenu}\n Digite o número da opção desejada.`)
}

const actionsList = {
    'menu': (chatId: string) => {
        handleSendMenu(chatId)
        return
    },
    'cancelar': (chatId: string) => {
        delete orders[chatId]
        client.sendMessage(chatId, `Seu pedido foi cancelado. Obrigado por entrar em contato, esperamos te ver novamente!
        \n Digite _\'menu\'_ para abrir o menu novamente.`)
    },
    'finalizar': (chatId: string) => {
        client.sendMessage(chatId, 'Sua compra está sendo finalizada. Obrigado por comprar na Vargas!')
        ongoingChats.splice(ongoingChats.indexOf(chatId), 1)
    }
}

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('message_create', async (msg) => {

    console.log('Chat ID: ', msg.from);
    if (msg.fromMe) return;

    // Filtering my phone numbers for testing purposes
    const whitelist = process.env.WHITELIST?.split(", ")
    
    if (!whitelist?.includes(msg.from)) return
    console.log('Orders: ', orders)
    console.log('ongoing chats: ', ongoingChats)

    const bodyMsg = msg.body.toLowerCase().trim()
    const chatId = msg.from

    // Message shown to first-message users
    if (!ongoingChats.includes(chatId)) {
        const contactData = await msg.getContact()
        const shortname = contactData.pushname.split(' ')[0]

        ongoingChats.push(chatId)
        client.sendMessage(chatId, `Olá, ${shortname}! Aqui é a atendente virtual da Barbearia Vargas. Vou te mandar o menu:`)

        handleSendMenu(chatId)
        return
    }

    // Handles other actions (cancel, menu, finish)
    Object.entries(actionsList).forEach(([key, value]) => {
        const action = key
        const response = value

        if (action === bodyMsg) {
            response(chatId)
            return
        }
    })

    // Handles menu options && order list
    if (Number(bodyMsg) > 0 && Number(bodyMsg) <= menu.length) {
        if (!orders[chatId]) {
            orders[chatId] = []
        }

        const selectedOption = menu[Number(bodyMsg)-1]

        if (orders[chatId].some(({ name }) => name === selectedOption.name)) {
            client.sendMessage(msg.from, 'Esta opção já está na sua lista. Por favor, escolha outra opção ou digite _\'finalizar\'_ para prosseguir com o pagamento.')
            return
        }

        orders[chatId].push(selectedOption)
        let textClientOrder = ''
        let totalPrice = orders[chatId].reduce((accumulator, currentValue) => accumulator + currentValue.price, 0)
        
        orders[chatId].forEach(order => textClientOrder += `• ${order.name} - *${order.price}R$*\n`)
        client.sendMessage(msg.from, `Sua lista:\n${textClientOrder}\n Preço total: *${totalPrice}R$* \n _finalizar_ ou _cancelar_`)
    }
   
    
    
})

getMenu()
client.initialize();
