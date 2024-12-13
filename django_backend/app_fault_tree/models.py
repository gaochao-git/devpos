# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class FaultTreeConfig(models.Model):
    id = models.BigAutoField(primary_key=True)
    ft_id = models.BigIntegerField(unique=True)
    ft_name = models.CharField(max_length=255,unique=True)
    ft_desc = models.TextField(blank=True, null=True)
    ft_status = models.CharField(max_length=32, blank=True, null=True)
    ft_content = models.TextField()
    version_num = models.IntegerField(blank=True, null=True)
    create_time = models.DateTimeField()
    update_time = models.DateTimeField()
    create_by = models.CharField(max_length=64, blank=True, null=True)
    update_by = models.CharField(max_length=64, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'fault_tree_config'


class FaultTreeConfigHistory(models.Model):
    id = models.BigAutoField(primary_key=True)
    history_id = models.BigIntegerField(unique=True)
    ft_id = models.BigIntegerField()
    ft_content = models.TextField()
    version_num = models.IntegerField()
    create_time = models.DateTimeField()
    update_time = models.DateTimeField()
    create_by = models.CharField(max_length=64, blank=True, null=True)
    update_by = models.CharField(max_length=64, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'fault_tree_config_history'
