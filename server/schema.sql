-- Need to run this as a super to set up hstore:
-- create extension hstore;

drop table if exists locations cascade;

create table locations (
    id serial primary key,
    name text,
    description text,
    edit_x int default 100,
    edit_y int default 100,
    created timestamp default current_timestamp
);

drop table if exists exits cascade;

create table exits (
    location_from int references locations(id) not null,
    location_to int references locations(id) not null,
    name text not null,
    primary key (location_from, location_to, name)
);

drop table if exists scripts cascade;

create table scripts (
    id serial primary key,
    name text not null,
    script text
);

drop table if exists entities cascade;

create table entities (
    id serial primary key,
    name text not null,
    description text,
    location_id int references locations(id),
    container int references entities(id),
    attributes hstore,
    aspects text[],
    created timestamp default current_timestamp
);


drop table if exists players cascade;

create table players (
    id serial primary key,
    entity_id int references entities(id),
    username text unique not null,
    password text not null,
    email text,
    created timestamp default current_timestamp
);

drop table if exists tokens cascade;

create table tokens (
    id serial primary key,
    token text,
    player_id int references players(id),
    created timestamp default current_timestamp
);
