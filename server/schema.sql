drop table if exists rooms;

create table rooms (
    id serial,
    name varchar(255)
);

drop table if exists entities;

create table entities (
    id serial,
    name varchar(255)
);
