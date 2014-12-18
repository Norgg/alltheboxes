from phusion/baseimage

env DEBIAN_FRONTEND noninteractive
run apt-get update
run apt-get upgrade -y
run apt-get install -y python3 python3-pip 
run apt-get install -y postgresql-contrib postgresql-server-dev-all

run mkdir -p /opt/alltheboxes/server
add server/requirements.txt /opt/alltheboxes/server/
run pip3 install -r /opt/alltheboxes/server/requirements.txt

RUN /etc/init.d/postgresql start &&\
    sudo -u postgres psql -c "CREATE USER alltheboxes WITH PASSWORD 'alltheboxes';" &&\
    sudo -u postgres createdb alltheboxes -O alltheboxes &&\
    sudo -u postgres psql alltheboxes -c "create extension hstore;"

add . /opt/alltheboxes
workdir /opt/alltheboxes/server
entrypoint /etc/init.d/postgresql start && /usr/bin/python3 alltheboxes.py
