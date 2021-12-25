use test;
alter table emp engine=innodb;
alter table emp1 engine=innodb;
insert into emp(name) values("666");
insert into emp1(name) values("666");