use test;
insert into emp(name) select 'a';
insert into emp(name) select name from emp;
use inception;
alter table statistic engine=innodb;
