scoreboard players remove @a[scores={deaths=1..,Hearts=22..}] Hearts 2
execute as @a[scores={deaths=1..,Hearts=20..}] at @s run function main:mechanic/set_max_hp
scoreboard players set @a[scores={deaths=1..}] deaths 0
