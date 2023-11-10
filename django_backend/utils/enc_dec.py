import base64
from hashlib import md5
from Crypto.Cipher import AES
from Crypto import Random
from gmssl.sm4 import SM4_DECRYPT,SM4_ENCRYPT,CryptSM4

MYKEY = 'aaaaaaaaaaaaaaaa'


def __bytes_to_key(data,salt, output=48):
    assert len(salt) == 8, len(salt)
    data += salt
    key = md5(data).digest()
    final_key = key
    while len(final_key) < output:
        key = md5(key + data).digest()
        final_key += key
    return final_key[:output]


def encrypt_aes_cbc(str_data, str_key=MYKEY):
    """
    用aes ecb模式加密数据
    :param str_data:
    :param str_key:
    :return:
    """
    byte_key = str_key.encode()
    byte_data = str_data.encode()
    BS = AES.block_size
    salt = Random.new().read(8)
    key_iv = __bytes_to_key(byte_key, salt, 32+16)
    key = key_iv[:32]
    iv = key_iv[32:]
    aes = AES.new(key, AES.MODE_CBC, iv)
    pad = lambda s: s + (BS - len(s) % BS) * chr(BS - len(s) % BS).encode()
    cipher_byte = base64.b64encode(b"Salted__" + salt + aes.encrypt(pad(byte_data)))
    return cipher_byte.decode()


def decrypt_aes_cbc(str_enc_base64, str_key=MYKEY):
    """
    用aes cbc模式解密数据
    :param str_enc_base64:
    :param str_key:
    :return:
    """
    byte_key = str_key.encode()
    byte_data = str_enc_base64.encode()
    unpad = lambda s: s[0:-ord(s[len(s) - 1:])]
    data = base64.b64decode(byte_data)
    assert data[:8] == b"Salted__"
    salt = data[8:16]
    key_iv = __bytes_to_key(byte_key, salt, 32 + 16)
    key = key_iv[:32]
    iv = key_iv[32:]
    aes = AES.new(key, AES.MODE_CBC, iv)
    plain_byte = unpad(aes.decrypt(data[16:]))
    return plain_byte.decode()


if __name__ == '__main__':
    key = "aaaaaaaaaaaaaaaa"
    strData = "123456"
    aa = encrypt_aes_cbc(strData, key)
    bb = decrypt_aes_cbc(aa, key)
    print(f"加密前字符串:{strData}, 加密后字符串:{aa}")
    print(f"解密前字符串:{aa}, 加密后字符串:{bb}")