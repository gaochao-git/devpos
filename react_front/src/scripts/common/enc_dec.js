import CryptoJS from "crypto-js";

const MYKEY = 'aaaaaaaaaaaaaaaa'

const decrypt_aes_cbc = (str_data, str_key=MYKEY) =>{
    const decrypt_data_str = CryptoJS.AES.decrypt(str_data,str_key).toString(CryptoJS.enc.Utf8);
    console.log(str_data, str_key,decrypt_data_str)
    return decrypt_data_str
}

export default decrypt_aes_cbc;