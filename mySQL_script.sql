-- Test mostly, not actually needed. For links.csv
CREATE TABLE links (
	movieId INT(6) unsigned PRIMARY KEY,
	imdbId INT(7) unsigned,
	tmdbId INT (6) unsigned
);

-- https://dev.mysql.com/doc/refman/8.0/en/load-data.html
-- Csv files are already loaded in the Folder (See Notes.txt).

-- Load data to links.csv
LOAD data
low_priority -- Just make sure that it does not interrupt another operation :p
INFILE '/home/styltsars/staticFiles/links.csv'
REPLACE 
INTO TABLE `web_dev`.`links`
FIELDS TERMINATED BY ',' optionally enclosed by '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES -- ignore header row. 
(`movieId`, `imdbId`, `tmdbId`); 

CREATE TABLE links (
	movieId INT(6) unsigned PRIMARY KEY,
	imdbId INT(7) unsigned,
	tmdbId INT (6) unsigned
);

-- movies.csv
-- drop table movies;
CREATE TABLE movies (
	movieId INT(6) unsigned PRIMARY KEY,
	title VARCHAR(250),
	genres VARCHAR(100)
);

LOAD data
low_priority -- Just make sure that it does not interrupt another operation :p
INFILE '/home/styltsars/staticFiles/movies.csv'
REPLACE 
INTO TABLE `web_dev`.`movies`
FIELDS TERMINATED BY ',' optionally enclosed by '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES -- ignore header row. 
(`movieId`, `title`, `genres`); 

-- ratings.csv
-- drop table ratings;
create table ratings (
	userId INT(7) unsigned,
	movieId INT(6) unsigned,
	rating FLOAT(2,1) unsigned,
	timestamp INT(15) unsigned
);

LOAD data
low_priority -- Just make sure that it does not interrupt another operation :p
INFILE '/home/styltsars/staticFiles/ratings.csv'
REPLACE 
INTO TABLE `web_dev`.`ratings`
FIELDS TERMINATED BY ',' optionally enclosed by '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES -- ignore header row. 
(`userId`, `movieId`, `rating`, `timestamp`); 

-- tags.csv
-- drop table tags;
create table tags (
	userId INT(7) unsigned,
	movieId INT(6) unsigned,
	tag VARCHAR(150),
	timestamp INT(15) unsigned
);

LOAD data
low_priority -- Just make sure that it does not interrupt another operation :p
INFILE '/home/styltsars/staticFiles/tags.csv'
REPLACE 
INTO TABLE `web_dev`.`tags`
FIELDS TERMINATED BY ',' optionally enclosed by '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES -- ignore header row. 
(`userId`, `movieId`, `tag`, `timestamp`); 

-- Tests
select * from links;
select * from movies;
select * from ratings;
select * from tags;

commit;

-- Dev Tests
select * 
from ratings 
where userId = 456;

select * 
from movies 
where movieId = 456;

select *
from ratings
where movieId = 4 or movieId = 5 or movieId = 12;

select *
from movies
where title like '%troy %';

