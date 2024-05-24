import { Client, LocalAuth } from 'whatsapp-web.js'
import qrcode from 'qrcode-terminal'
require('dotenv').config()

const client = new Client({ authStrategy: new LocalAuth(), webVersionCache: {
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2409.0-beta.html',
    type: 'remote',
} });

let hasClientStartedChat = false
let isOrderFinished = false
let isOrderCancelled = false

const messagesList = [
    {
        senderMsg: '1',
        responseMsg: 'Olá! Aqui é a vargas barbearia.'
    },
    {
        senderMsg: 'Tudo bem?',
        responseMsg: 'Tudo e contigo?'
    }
]

const menu = [
    { name: 'Corte', price: 55 },
    { name: 'Corte com Maquina', price: 35 },
    { name: 'Degradê na Maquina ', price: 40 },
    { name: 'Barba', price: 45 },
    { name: 'Combo Barba e Cabelo ', price: 70 },
];

const clientOrder = []

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('message_create', (msg) => {

    // Filtering my phone numbers for testing purposes
    if (msg.from !== process.env.PHONE_NUMBER_SELF && msg.from !== process.env.PHONE_NUMBER_OTHER) return
    

    if (!hasClientStartedChat) {
        hasClientStartedChat = true
        client.sendMessage(msg.from, 'Olá! Vejo que é sua primeira vez entrando em contato conosco! Vou te mandar o menu:')

        let textMenu = ''
        menu.forEach((menuItem, index) => textMenu += `${index + 1}. ${menuItem.name} - *${menuItem.price}R$*\n`)

        client.sendMessage(msg.from, `${textMenu}\n Digite o número da opção desejada.`)
        return;
    }


    
    const bodyMsg = msg.body.toLowerCase().trim()
    console.log(bodyMsg);

    if (bodyMsg === 'cancelar') {
        clientOrder.length = 0
        console.log(clientOrder);
        
    }
    

    if (Number(bodyMsg) > 0 && Number(bodyMsg) <= menu.length) {
        console.log(`Opção selecionada: ${bodyMsg}, item correspondente: ${menu[Number(bodyMsg)-1]}`);
        
        clientOrder.push(menu[Number(bodyMsg)-1])
        let textClientOrder = ''
        let totalPrice = clientOrder.reduce((accumulator, currentValue) => accumulator + currentValue.price, 0)
        
        clientOrder.forEach(order => textClientOrder += `• ${order.name} - *${order.price}R$*\n`)
        client.sendMessage(msg.from, `Sua lista:\n ${textClientOrder}\n Preço total: *${totalPrice}R$* \n _finalizar_ ou _cancelar_`)
    }
   
    
    
})

client.initialize();
