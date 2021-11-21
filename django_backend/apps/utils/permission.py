class IsAuthenticated:
    def has_permission(self, request, view):
        bearer_token = request.META.get('HTTP_AUTHORIZATION')  # Bearer undefined || Bearer xxxxxx
        token = bearer_token.split(' ')[1]
        print("IsAuthenticated")
        return True

class IsAdminUser:
    def has_permission(self, request, view):
        bearer_token = request.META.get('HTTP_AUTHORIZATION')  # Bearer undefined || Bearer xxxxxx
        token = bearer_token.split(' ')[1]
        print(token)
        return True

class IsQa:
    def has_permission(self, request, view):
        bearer_token = request.META.get('HTTP_AUTHORIZATION')  # Bearer undefined || Bearer xxxxxx
        token = bearer_token.split(' ')[1]
        print('qa')
        return True

class IsDba:
    def has_permission(self, request, view):
        bearer_token = request.META.get('HTTP_AUTHORIZATION')  # Bearer undefined || Bearer xxxxxx
        token = bearer_token.split(' ')[1]
        print('dba')
        return True

class IsExecuteSql:
    def has_permission(self, request, view):
        bearer_token = request.META.get('HTTP_AUTHORIZATION')  # Bearer undefined || Bearer xxxxxx
        token = bearer_token.split(' ')[1]
        print('dba')
        return True