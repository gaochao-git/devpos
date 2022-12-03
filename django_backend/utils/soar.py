from utils.cmd_plugin.plugin import Plugin
from django.conf import settings
SOAR_CMD = settings.SOAR_PATH
SOAR_CONF = settings.SOAR_CONF
soar_user = settings.SOAR_USER
soar_pass = settings.SOAR_PASS

class Soar(Plugin):
    def __init__(self):
        self.path = SOAR_CMD
        self.required_args = ["query"]
        self.disable_args = []
        super(Plugin, self).__init__()

    def fingerprint(self, sql):
        """
        输出SQL的指纹
        :param sql:
        :return:
        """
        args = {"query": sql, "report-type": "fingerprint"}
        cmd_args = self._generate_args2cmd(args)
        return self.execute_cmd(cmd_args=cmd_args)

    def compress(self, sql):
        """
        压缩SQL
        :param sql:
        :return:
        """
        args = {"query": sql, "report-type": "compress"}
        cmd_args = self._generate_args2cmd(args)
        return self.execute_cmd(cmd_args=cmd_args)

    def pretty(self, sql):
        """
        美化SQL
        :param sql:
        :return:
        """
        args = {
            "query": sql,
            "max-pretty-sql-length": 100000,  # 超出该长度的SQL会转换成指纹输出 (default 1024)
            "report-type": "pretty",
        }
        cmd_args = self._generate_args2cmd(args)
        return self.execute_cmd(cmd_args=cmd_args)

    def remove_comment(self, sql):
        """
        去除SQL语句中的注释，支持单行多行注释的去除
        :param sql:
        :return:
        """
        args = {"query": sql, "report-type": "remove-comment"}
        cmd_args = self._generate_args2cmd(args)
        return self.execute_cmd(cmd_args=cmd_args)

    def rewrite(self, sql, rewrite_rules=None):
        """
        SQL改写
        :param sql:
        :param rewrite_rules:
        :return:
        """
        rewrite_type_list = [
            "dml2select",
            "star2columns",
            "insertcolumns",
            "having",
            "orderbynull",
            "unionall",
            "or2in",
            "dmlorderby",
            "distinctstar",
            "standard",
            "mergealter",
            "alwaystrue",
            "countstar",
            "innodb",
            "autoincrement",
            "intwidth",
            "truncate",
            "rmparenthesis",
            "delimiter",
        ]
        rewrite_rules = rewrite_rules if rewrite_rules else ["dml2select"]
        if set(rewrite_rules).issubset(set(rewrite_type_list)) is False:
            raise RuntimeError(f"不支持的改写规则，仅支持{rewrite_type_list}")
        args = {
            "query": sql,
            "report-type": "rewrite",
            "rewrite-rules": ",".join(rewrite_type_list),
        }
        cmd_args = self._generate_args2cmd(args)
        return self.execute_cmd(cmd_args=cmd_args)

    def query_tree(self, sql):
        """
        语法树打印，包括[ast, tiast, ast-json, tiast-json]
        :param sql:
        :return:
        """
        args = {"query": sql, "report-type": "ast-json"}
        cmd_args = self._generate_args2cmd(args)
        p = self.execute_cmd(cmd_args=cmd_args)
        stdout = p.stdout.read()
        stderr = p.stderr.read()
        out = stdout if stdout else stderr
        return out

    def analyze_sql(self, ip, port, db_name, sql):
        """
        分析SQL质量
        :param ip:
        :param port:
        :param db_name:
        :param sql:
        :return:
        """
        online_dsn = f"{soar_user}:{soar_pass}@{ip}:{port}/{db_name}"
        print(online_dsn)
        args = {"config":SOAR_CONF, "query": sql, "online-dsn": online_dsn,"test-dsn": online_dsn,"allow-online-as-test": False,}
        cmd_args = self._generate_args2cmd(args)
        p = self.execute_cmd(cmd_args=cmd_args)
        stdout = p.stdout.read()
        stderr = p.stderr.read()
        out = stdout if stdout else stderr
        return out