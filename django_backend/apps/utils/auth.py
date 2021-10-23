from rest_framework.exceptions import AuthenticationFailed
from rest_framework.authentication import BaseAuthentication


class UserAuth(BaseAuthentication):
    msg = "认证失败"
    print(7777777)
    def authenticate(self, request):
        usertoken = 'xxxx'
        if usertoken:
            return usertoken.user, usertoken.token
        else:
            raise AuthenticationFailed("认证失败!")