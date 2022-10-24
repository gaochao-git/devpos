from gmssl import sm4


class PySM4:
    """
    国产加密 sm4加解密
    """

    def __init__(self):
        self.crypt_sm4 = sm4.CryptSM4()  # 实例化
        self._key = "638gt9b32af486e65d6f93dbc41b9kkk"

    def enc_sm4(self,  value):
        """
        国密sm4加密
        :param value: 待加密的字符串
        :return: sm4加密后的十六进制值
        """
        crypt_sm4 = self.crypt_sm4
        crypt_sm4.set_key(self._key.encode(), sm4.SM4_ENCRYPT)  # 设置密钥
        date_str = str(value)
        enc_value = crypt_sm4.crypt_ecb(date_str.encode())  # 开始加密。bytes类型
        return enc_value.hex()  # 返回十六进制值

    def dec_sm4(self, enc_value):
        """
        国密sm4解密
        :param enc_value: 待解密的十六进制值
        :return: 原字符串
        """
        crypt_sm4 = self.crypt_sm4
        crypt_sm4.set_key(self._key.encode(), sm4.SM4_DECRYPT)  # 设置密钥
        decrypt_value = crypt_sm4.crypt_ecb(bytes.fromhex(enc_value))  # 开始解密。十六进制类型
        return decrypt_value.decode()


if __name__ == '__main__':
    strData = "xxxxx"
    SM4 = PySM4()
    print("原字符：", strData)
    encData = SM4.enc_sm4(strData)  # 加密后的数据，返回bytes类型
    print("sm4加密结果：", encData)
    decData = SM4.dec_sm4(encData)
    print("sm4解密结果：", decData)  # 解密后的数据