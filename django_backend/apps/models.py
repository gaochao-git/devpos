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
        managed = False
        db_table = 'mysql_cluster'


class MysqlClusterInstance(models.Model):
    cluster_name = models.CharField(max_length=64)
    instance_name = models.CharField(unique=True, max_length=100)
    instance_role = models.CharField(max_length=64)

    class Meta:
        managed = False
        db_table = 'mysql_cluster_instance'

