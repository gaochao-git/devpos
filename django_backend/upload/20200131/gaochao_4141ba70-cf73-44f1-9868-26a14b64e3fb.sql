use test;
alter table emp engine=innodb;
insert into emp(name) values("666");