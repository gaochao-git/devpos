from rest_framework_jwt.utils import jwt_decode_handler
from apps.utils import db_helper


class RbacPermisson:
    def has_permission(self, request, view):
        bearer_token = request.META.get('HTTP_AUTHORIZATION')  # Bearer undefined || Bearer xxxxxx
        token = bearer_token.split(' ')[1]
        token_user = jwt_decode_handler(token)
        username = token_user['username']
        url = request.path
        sql = """
            select resource_name 
            from cloud_rbac_role_permission a inner join cloud_rbac_user_role b 
            on a.role_name=b.role_name where b.username='{}' and resource_name='{}'
        """.format(username, url)
        ret = db_helper.find_all(sql)
        if ret['status'] != 'ok' : return False
        if len(ret['data']) == 0 : return False
        return True