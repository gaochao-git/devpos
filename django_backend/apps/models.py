# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey has `on_delete` set to the desired behavior.
#   * Remove `managed = True` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class MysqlCluster(models.Model):
    cluster_type = models.CharField(max_length=30)
    cluster_name = models.CharField(unique=True, max_length=64)
    cluster_grade = models.IntegerField()
    cluster_status = models.IntegerField()
    cluster_department = models.CharField(max_length=15)
    create_time = models.DateTimeField()
    update_time = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'mysql_cluster'


class MysqlClusterInstance(models.Model):
    cluster_name = models.CharField(max_length=64)
    instance_name = models.CharField(unique=True, max_length=100)
    instance_role = models.CharField(max_length=64)

    class Meta:
        managed = True
        db_table = 'mysql_cluster_instance'


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
        managed = True
        db_table = 'sql_submit_info'
