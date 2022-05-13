# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey has `on_delete` set to the desired behavior.
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class AnsibleApiLog(models.Model):
    submit_uuid = models.CharField(max_length=50)
    stdout_log = models.TextField()
    step_task_status = models.CharField(max_length=30)
    create_time = models.DateTimeField()
    update_time = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'ansible_api_log'


class AuditSqlLog(models.Model):
    id = models.BigAutoField(primary_key=True)
    split_file = models.CharField(max_length=150)
    audit_log_info = models.CharField(max_length=500)
    step_status = models.IntegerField()
    create_time = models.DateTimeField()
    update_time = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'audit_sql_log'


class AuthGroup(models.Model):
    name = models.CharField(unique=True, max_length=80)

    class Meta:
        managed = False
        db_table = 'auth_group'


class AuthGroupPermissions(models.Model):
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)
    permission = models.ForeignKey('AuthPermission', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_group_permissions'
        unique_together = (('group', 'permission'),)


class AuthPermission(models.Model):
    name = models.CharField(max_length=255)
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING)
    codename = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'auth_permission'
        unique_together = (('content_type', 'codename'),)


class AuthUser(models.Model):
    password = models.CharField(max_length=128)
    last_login = models.DateTimeField(blank=True, null=True)
    is_superuser = models.IntegerField()
    username = models.CharField(unique=True, max_length=150)
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=150)
    email = models.CharField(max_length=254)
    is_staff = models.IntegerField()
    is_active = models.IntegerField()
    date_joined = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'auth_user'


class AuthUserGroups(models.Model):
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_groups'
        unique_together = (('user', 'group'),)


class AuthUserUserPermissions(models.Model):
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    permission = models.ForeignKey(AuthPermission, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_user_permissions'
        unique_together = (('user', 'permission'),)


class AuthtokenToken(models.Model):
    key = models.CharField(primary_key=True, max_length=40)
    created = models.DateTimeField()
    user = models.ForeignKey(AuthUser, models.DO_NOTHING, unique=True)

    class Meta:
        managed = False
        db_table = 'authtoken_token'


class CeleryTaskmeta(models.Model):
    task_id = models.CharField(unique=True, max_length=255)
    status = models.CharField(max_length=50)
    result = models.TextField(blank=True, null=True)
    date_done = models.DateTimeField()
    traceback = models.TextField(blank=True, null=True)
    hidden = models.IntegerField()
    meta = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'celery_taskmeta'


class CeleryTasksetmeta(models.Model):
    taskset_id = models.CharField(unique=True, max_length=255)
    result = models.TextField()
    date_done = models.DateTimeField()
    hidden = models.IntegerField()

    class Meta:
        managed = False
        db_table = 'celery_tasksetmeta'


class CloudRbacGroupBak(models.Model):
    organization = models.CharField(max_length=80)
    department = models.CharField(max_length=80)
    group_name = models.CharField(max_length=80)

    class Meta:
        managed = False
        db_table = 'cloud_rbac_group_bak'
        unique_together = (('department', 'group_name'),)


class CloudRbacResource(models.Model):
    resource_name = models.CharField(unique=True, max_length=80)
    description = models.CharField(max_length=80)

    class Meta:
        managed = False
        db_table = 'cloud_rbac_resource'


class CloudRbacRole(models.Model):
    role_name = models.CharField(unique=True, max_length=80)
    create_by = models.CharField(max_length=50)
    update_by = models.CharField(max_length=50)
    create_time = models.DateTimeField()
    update_time = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'cloud_rbac_role'


class CloudRbacRoleGroupBak(models.Model):
    role_name = models.CharField(max_length=80)
    group_name = models.CharField(max_length=80)

    class Meta:
        managed = False
        db_table = 'cloud_rbac_role_group_bak'


class CloudRbacRoleResourceBak(models.Model):
    resource_name = models.CharField(max_length=80)
    role_name = models.CharField(max_length=80)

    class Meta:
        managed = False
        db_table = 'cloud_rbac_role_resource_bak'
        unique_together = (('role_name', 'resource_name'),)


class CloudRbacUser(models.Model):
    username = models.CharField(unique=True, max_length=80)
    display_username = models.CharField(max_length=80)
    user_email = models.CharField(max_length=80)

    class Meta:
        managed = False
        db_table = 'cloud_rbac_user'


class CloudRbacUserGroupBak(models.Model):
    username = models.CharField(max_length=80)
    group_name = models.CharField(max_length=80)

    class Meta:
        managed = False
        db_table = 'cloud_rbac_user_group_bak'


class CloudRbacUserRoleBak(models.Model):
    username = models.CharField(max_length=80)
    role_name = models.CharField(max_length=80)

    class Meta:
        managed = False
        db_table = 'cloud_rbac_user_role_bak'


class CommonUser(models.Model):
    user_name = models.CharField(unique=True, max_length=50)
    user_password = models.CharField(max_length=50)
    user_host = models.CharField(max_length=200)
    privileges = models.CharField(max_length=200)
    db_name = models.CharField(max_length=200)
    tb_name = models.CharField(max_length=200)
    status = models.IntegerField()
    ctime = models.DateTimeField()
    utime = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'common_user'


class DeployMysqlSubmitInfo(models.Model):
    submit_uuid = models.CharField(unique=True, max_length=50)
    submit_user = models.CharField(max_length=50)
    idc = models.CharField(max_length=50)
    deploy_topos = models.TextField()
    deploy_version = models.CharField(max_length=50)
    deploy_archit = models.CharField(max_length=50)
    deploy_other_param = models.TextField(blank=True, null=True)
    submit_check = models.IntegerField()
    submit_check_username = models.CharField(max_length=50)
    submit_check_comment = models.CharField(max_length=200)
    submit_execute = models.IntegerField()
    submit_execute_username = models.CharField(max_length=50)
    deploy_status = models.IntegerField()
    task_send_celery = models.CharField(max_length=50)
    create_time = models.DateTimeField()
    update_time = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'deploy_mysql_submit_info'


class DjangoAdminLog(models.Model):
    action_time = models.DateTimeField()
    object_id = models.TextField(blank=True, null=True)
    object_repr = models.CharField(max_length=200)
    action_flag = models.PositiveSmallIntegerField()
    change_message = models.TextField()
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING, blank=True, null=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'django_admin_log'


class DjangoContentType(models.Model):
    app_label = models.CharField(max_length=100)
    model = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'django_content_type'
        unique_together = (('app_label', 'model'),)


class DjangoMigrations(models.Model):
    app = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    applied = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_migrations'


class DjangoSession(models.Model):
    session_key = models.CharField(primary_key=True, max_length=40)
    session_data = models.TextField()
    expire_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_session'


class DjceleryCrontabschedule(models.Model):
    minute = models.CharField(max_length=64)
    hour = models.CharField(max_length=64)
    day_of_week = models.CharField(max_length=64)
    day_of_month = models.CharField(max_length=64)
    month_of_year = models.CharField(max_length=64)

    class Meta:
        managed = False
        db_table = 'djcelery_crontabschedule'


class DjceleryIntervalschedule(models.Model):
    every = models.IntegerField()
    period = models.CharField(max_length=24)

    class Meta:
        managed = False
        db_table = 'djcelery_intervalschedule'


class DjceleryPeriodictask(models.Model):
    name = models.CharField(unique=True, max_length=200)
    task = models.CharField(max_length=200)
    args = models.TextField()
    kwargs = models.TextField()
    queue = models.CharField(max_length=200, blank=True, null=True)
    exchange = models.CharField(max_length=200, blank=True, null=True)
    routing_key = models.CharField(max_length=200, blank=True, null=True)
    expires = models.DateTimeField(blank=True, null=True)
    enabled = models.IntegerField()
    last_run_at = models.DateTimeField(blank=True, null=True)
    total_run_count = models.PositiveIntegerField()
    date_changed = models.DateTimeField()
    description = models.TextField()
    crontab = models.ForeignKey(DjceleryCrontabschedule, models.DO_NOTHING, blank=True, null=True)
    interval = models.ForeignKey(DjceleryIntervalschedule, models.DO_NOTHING, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'djcelery_periodictask'


class DjceleryPeriodictasks(models.Model):
    ident = models.SmallIntegerField(primary_key=True)
    last_update = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'djcelery_periodictasks'


class DjceleryTaskstate(models.Model):
    state = models.CharField(max_length=64)
    task_id = models.CharField(unique=True, max_length=36)
    name = models.CharField(max_length=200, blank=True, null=True)
    tstamp = models.DateTimeField()
    args = models.TextField(blank=True, null=True)
    kwargs = models.TextField(blank=True, null=True)
    eta = models.DateTimeField(blank=True, null=True)
    expires = models.DateTimeField(blank=True, null=True)
    result = models.TextField(blank=True, null=True)
    traceback = models.TextField(blank=True, null=True)
    runtime = models.FloatField(blank=True, null=True)
    retries = models.IntegerField()
    hidden = models.IntegerField()
    worker = models.ForeignKey('DjceleryWorkerstate', models.DO_NOTHING, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'djcelery_taskstate'


class DjceleryWorkerstate(models.Model):
    hostname = models.CharField(unique=True, max_length=255)
    last_heartbeat = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'djcelery_workerstate'


class EasyauditCrudevent(models.Model):
    event_type = models.SmallIntegerField()
    object_id = models.IntegerField()
    object_repr = models.CharField(max_length=255, blank=True, null=True)
    object_json_repr = models.TextField(blank=True, null=True)
    datetime = models.DateTimeField()
    content_type = models.ForeignKey(DjangoContentType, models.DO_NOTHING)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING, blank=True, null=True)
    user_pk_as_string = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'easyaudit_crudevent'


class EasyauditLoginevent(models.Model):
    login_type = models.SmallIntegerField()
    username = models.CharField(max_length=255, blank=True, null=True)
    datetime = models.DateTimeField()
    user = models.ForeignKey(AuthUser, models.DO_NOTHING, blank=True, null=True)
    remote_ip = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'easyaudit_loginevent'


class EasyauditRequestevent(models.Model):
    url = models.CharField(max_length=255)
    method = models.CharField(max_length=20)
    query_string = models.CharField(max_length=255, blank=True, null=True)
    remote_ip = models.CharField(max_length=50, blank=True, null=True)
    datetime = models.DateTimeField()
    user = models.ForeignKey(AuthUser, models.DO_NOTHING, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'easyaudit_requestevent'


class MyCeleryTaskStatus(models.Model):
    id = models.BigAutoField(primary_key=True)
    task_id = models.CharField(unique=True, max_length=50)
    submit_id = models.CharField(max_length=50)
    task_type = models.CharField(max_length=150)
    task_status = models.IntegerField()
    content = models.TextField(blank=True, null=True)
    create_time = models.DateTimeField()
    update_time = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'my_celery_task_status'
        unique_together = (('submit_id', 'task_type'),)


class MysqlCluster(models.Model):
    cluster_type = models.CharField(max_length=30)
    cluster_name = models.CharField(unique=True, max_length=64)
    cluster_grade = models.IntegerField()
    cluster_status = models.IntegerField()
    cluster_department = models.CharField(max_length=15)
    create_time = models.DateTimeField()
    update_time = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'mysql_cluster'


class MysqlClusterInstance(models.Model):
    cluster_name = models.CharField(max_length=64)
    instance_name = models.CharField(unique=True, max_length=100)
    instance_role = models.CharField(max_length=64)

    class Meta:
        managed = False
        db_table = 'mysql_cluster_instance'


class MysqlInstance(models.Model):
    host_name = models.CharField(max_length=50)
    host_ip = models.CharField(max_length=50)
    port = models.IntegerField()
    instance_name = models.CharField(max_length=100)
    instance_status = models.IntegerField()
    read_only = models.CharField(max_length=10)
    version = models.CharField(max_length=50)
    bufferpool = models.CharField(max_length=50)
    server_charset = models.CharField(max_length=50)
    master_ip = models.CharField(max_length=50)
    master_port = models.CharField(max_length=50)

    class Meta:
        managed = False
        db_table = 'mysql_instance'
        unique_together = (('host_name', 'port'), ('host_ip', 'port'),)


class PrivateUser(models.Model):
    user_name = models.CharField(unique=True, max_length=50)
    user_password = models.CharField(max_length=50)
    user_host = models.CharField(max_length=200)
    privileges = models.CharField(max_length=200)
    db_name = models.CharField(max_length=200)
    tb_name = models.CharField(max_length=200)
    status = models.IntegerField()
    ctime = models.DateTimeField()
    utime = models.DateTimeField()
    db_master_ip = models.CharField(max_length=200)
    db_master_port = models.IntegerField()

    class Meta:
        managed = False
        db_table = 'private_user'


class PrivilegeRequestInfo(models.Model):
    order_uuid = models.CharField(unique=True, max_length=40)
    person_name = models.CharField(max_length=50)
    request_type = models.IntegerField()
    department = models.CharField(max_length=30)
    leader = models.CharField(max_length=20)
    dba = models.CharField(max_length=20)
    leader_check_result = models.IntegerField()
    dba_check_result = models.IntegerField()
    db_master_ip = models.CharField(max_length=200)
    db_master_port = models.IntegerField()
    user_name = models.CharField(max_length=50)
    user_host = models.CharField(max_length=200)
    privileges = models.CharField(max_length=200)
    db_name = models.CharField(max_length=200)
    tb_name = models.CharField(max_length=200)
    status = models.IntegerField()
    ctime = models.DateTimeField()
    utime = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'privilege_request_info'


class ResourceConfig(models.Model):
    id = models.BigAutoField(primary_key=True)
    company = models.CharField(max_length=150)
    resource_name = models.CharField(max_length=50)
    resource_value = models.TextField()
    config_user = models.CharField(max_length=50)
    create_time = models.DateTimeField()
    update_time = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'resource_config'


class Server(models.Model):
    server_public_ip = models.CharField(unique=True, max_length=50)
    server_private_ip = models.CharField(unique=True, max_length=50)
    server_hostname = models.CharField(unique=True, max_length=200)
    server_usage = models.IntegerField()
    server_type = models.IntegerField()
    server_os = models.CharField(max_length=50)
    memory = models.CharField(max_length=50)
    disk_capacity = models.CharField(max_length=50)
    disk_type = models.CharField(max_length=50)
    network_type = models.CharField(max_length=50)
    public_network_bandwidth = models.CharField(max_length=50)
    private_network_bandwidth = models.CharField(max_length=50)
    cpu_size = models.IntegerField()
    deadline = models.DateTimeField()
    status = models.IntegerField()
    ctime = models.DateTimeField()
    utime = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'server'


class SqlCheckResults(models.Model):
    submit_sql_uuid = models.CharField(max_length=50)
    inception_id = models.IntegerField()
    inception_stage = models.CharField(max_length=20)
    inception_error_level = models.IntegerField()
    inception_stage_status = models.CharField(max_length=64)
    inception_error_message = models.TextField()
    inception_sql = models.TextField(blank=True, null=True)
    inception_affected_rows = models.IntegerField()
    inception_sequence = models.CharField(max_length=255)
    inception_backup_dbnames = models.CharField(max_length=255)
    inception_execute_time = models.CharField(max_length=100)
    inception_sqlsha1 = models.CharField(max_length=255)
    inception_command = models.CharField(max_length=255)
    inception_executed_time = models.CharField(max_length=100)
    inception_remain_time = models.CharField(max_length=100)
    inception_execute_percent = models.IntegerField()
    is_submit = models.IntegerField()
    ctime = models.DateTimeField()
    utime = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'sql_check_results'


class SqlExecuteResults(models.Model):
    submit_sql_uuid = models.CharField(max_length=50)
    split_seq = models.IntegerField()
    split_sql_file_path = models.CharField(max_length=200)
    rerun_seq = models.IntegerField()
    inception_id = models.IntegerField()
    inception_stage = models.CharField(max_length=20)
    inception_error_level = models.IntegerField()
    inception_stage_status = models.CharField(max_length=64)
    inception_error_message = models.TextField()
    inception_sql = models.TextField(blank=True, null=True)
    inception_affected_rows = models.IntegerField()
    inception_sequence = models.CharField(max_length=255)
    inception_backup_dbname = models.CharField(max_length=255)
    inception_execute_time = models.DecimalField(max_digits=16, decimal_places=4)
    inception_sqlsha1 = models.CharField(max_length=255)
    inception_command = models.CharField(max_length=255)
    ctime = models.DateTimeField()
    utime = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'sql_execute_results'


class SqlExecuteSplit(models.Model):
    submit_sql_uuid = models.CharField(max_length=50)
    split_seq = models.IntegerField()
    rerun_seq = models.IntegerField()
    rerun_flag = models.IntegerField()
    rerun_sequence = models.CharField(max_length=50)
    ddlflag = models.IntegerField()
    sql_num = models.IntegerField()
    split_sql_file_path = models.CharField(unique=True, max_length=150)
    submit_source_db_type = models.IntegerField()
    cluster_name = models.CharField(max_length=50)
    master_ip = models.CharField(max_length=50)
    master_port = models.IntegerField()
    submit_sql_execute_type = models.CharField(max_length=50)
    submit_sql_execute_plat_or_manual = models.IntegerField()
    inception_osc_config = models.CharField(max_length=10000)
    inception_backup = models.IntegerField()
    inception_check_ignore_warning = models.IntegerField()
    inception_execute_ignore_error = models.IntegerField()
    dba_execute = models.IntegerField()
    execute_status = models.IntegerField()
    task_send_celery = models.IntegerField()
    ctime = models.DateTimeField()
    utime = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'sql_execute_split'


class SqlInceptionOscConfig(models.Model):
    variable_name = models.CharField(max_length=200)
    variable_value = models.CharField(max_length=200)
    variable_description = models.CharField(max_length=2000, blank=True, null=True)
    editable = models.IntegerField(blank=True, null=True)
    create_time = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'sql_inception_osc_config'


class SqlPreCheckResultsBk(models.Model):
    submit_sql_uuid = models.CharField(max_length=50)
    inception_id = models.IntegerField()
    inception_stage = models.CharField(max_length=20)
    inception_error_level = models.IntegerField()
    inception_stage_status = models.CharField(max_length=64)
    inception_error_message = models.TextField()
    inception_sql = models.TextField(blank=True, null=True)
    inception_affected_rows = models.IntegerField()
    inception_sequence = models.CharField(max_length=255)
    inception_backup_dbnames = models.CharField(max_length=255)
    inception_execute_time = models.CharField(max_length=100)
    inception_sqlsha1 = models.CharField(max_length=255)
    inception_command = models.CharField(max_length=255)
    inception_executed_time = models.CharField(max_length=100)
    inception_remain_time = models.CharField(max_length=100)
    inception_execute_percent = models.IntegerField()
    ctime = models.DateTimeField()
    utime = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'sql_pre_check_results_bk'


class SqlSubmitInfo(models.Model):
    submit_sql_uuid = models.CharField(unique=True, max_length=50)
    submit_sql_user = models.CharField(max_length=50)
    submit_sql_file_path = models.CharField(max_length=200)
    user_offer_rollback_sql_file_path = models.CharField(max_length=200)
    title = models.CharField(max_length=50)
    leader_user_name = models.CharField(max_length=50)
    qa_user_name = models.CharField(max_length=50)
    dba_check_user_name = models.CharField(max_length=50)
    dba_execute_user_name = models.CharField(max_length=50)
    submit_source_db_type = models.IntegerField()
    cluster_name = models.CharField(max_length=50)
    master_ip = models.CharField(max_length=50)
    master_port = models.IntegerField()
    comment_info = models.CharField(max_length=200)
    leader_check = models.IntegerField()
    qa_check = models.IntegerField()
    dba_check = models.IntegerField()
    leader_check_comment = models.CharField(max_length=200)
    qa_check_comment = models.CharField(max_length=200)
    dba_check_comment = models.CharField(max_length=200)
    submit_sql_execute_type = models.CharField(max_length=50)
    submit_sql_execute_plat_or_manual = models.IntegerField()
    inception_osc_config = models.CharField(max_length=10000)
    inception_backup = models.IntegerField()
    inception_check_ignore_warning = models.IntegerField()
    inception_execute_ignore_error = models.IntegerField()
    dba_execute = models.IntegerField()
    execute_status = models.IntegerField()
    is_submit = models.IntegerField()
    ctime = models.DateTimeField()
    utime = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'sql_submit_info'


class TeamCheckRole(models.Model):
    gid = models.IntegerField()
    gname = models.CharField(max_length=50)
    qa_name = models.CharField(max_length=50)
    leader_name = models.CharField(max_length=50)
    dba_name = models.CharField(max_length=50)

    class Meta:
        managed = False
        db_table = 'team_check_role'


class TeamUser(models.Model):
    uid = models.CharField(max_length=50)
    gid = models.IntegerField()
    uname = models.CharField(max_length=50)
    department = models.CharField(max_length=50)
    title = models.CharField(max_length=50)

    class Meta:
        managed = False
        db_table = 'team_user'


class WorkFlowLog(models.Model):
    submit_uuid = models.CharField(max_length=50)
    work_type = models.CharField(max_length=50)
    op_username = models.CharField(max_length=50)
    op_comment = models.CharField(max_length=50)
    op_type = models.CharField(max_length=50)
    create_time = models.DateTimeField()
    update_time = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'work_flow_log'
