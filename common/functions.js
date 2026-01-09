var CryptoJS = require("crypto-js");

module.exports = {
    encryptor: async function (text, key) {
        const encrypted = CryptoJS.AES.encrypt(text, key).toString();
        return encrypted;
    },
    decryptor: async function (encryptedText, key) {
        const bytes  = CryptoJS.AES.decrypt(encryptedText, key);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        return originalText;
    },
    getUSDPrice : async function getWETHPrice(amount){
        const resp = await fetch('https://api.coinconvert.net/convert/eth/usd?amount='+amount)
        const respJson = await resp.json();
        console.log(respJson);
        return respJson?.USD
    }
}