const crypto = require("crypto")

exports.encryptString = string => {
    const cipher = crypto.createCipher('aes-256-cbc', 'd6F3Efeq');
    let crypted = cipher.update(string, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
};

exports.decryptString = string => {
    const decipher = crypto.createDecipher('aes-256-cbc', 'd6F3Efeq');
    let dec = decipher.update(string, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
};