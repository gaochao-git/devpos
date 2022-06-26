import base64
from Crypto.PublicKey import RSA
from Crypto.Hash import SHA
from Crypto.Signature import PKCS1_v1_5 as PKCS1_signature
from Crypto.Cipher import PKCS1_v1_5 as PKCS1_cipher
import os
RSA_PATH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def get_key(key_file):
    with open("{}/rsa_key/{}".format(RSA_PATH, key_file)) as f:
        data = f.read()
        key = RSA.importKey(data)
    return key


def encrypt_data(msg):
    public_key = get_key('sa_public_key.pem')
    cipher = PKCS1_cipher.new(public_key)
    encrypt_text = base64.b64encode(cipher.encrypt(bytes(msg.encode("utf8"))))
    return encrypt_text.decode('utf-8')


def decrypt_data(encrypt_msg):
    private_key = get_key('rsa_private_key.pem')
    cipher = PKCS1_cipher.new(private_key)
    back_text = cipher.decrypt(base64.b64decode(encrypt_msg), 0)
    return back_text.decode('utf-8')