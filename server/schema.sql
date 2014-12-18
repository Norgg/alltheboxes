drop table if exists locations cascade;

create table locations (
    id serial primary key,
    name varchar(255)
);

drop table if exists entities cascade;

create table entities (
    id serial primary key,
    name varchar(255) not null,
    description varchar(255),
    room int references locations(id),
    container int references entities(id)
);

drop table if exists players cascade;

create table players (
    id serial primary key,
    entity_id int references entities(id),
    username varchar(255) not null,
    password varchar(255) not null
);
