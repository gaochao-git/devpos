from Crypto import Random
from Crypto.PublicKey import RSA

def generate_key():
    """
    生成公私钥对
    :return:
    """
    random_generator = Random.new().read
    rsa = RSA.generate(2048, random_generator)
    # 生成私钥
    private_key = rsa.exportKey()
    print(private_key.decode('utf-8'))
    # 生成公钥
    public_key = rsa.publickey().exportKey()
    print(public_key.decode('utf-8'))

    path = '/Users/gaochao/gaochao-git/gaochao_repo/devpos/django_backend/apps/utils/rsa_key'
    with open('%s/rsa_private_key.pem' % path, 'wb')as f:
        f.write(private_key)

    with open('%s/rsa_public_key.pem' % path, 'wb')as f:
        f.write(public_key)


if __name__ == '__main__':
    generate_key()