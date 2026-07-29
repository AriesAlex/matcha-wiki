execute in minecraft:the_end run summon item 0 100 0 {Age:-32768,Item:{id:"minecraft:nether_star",count:1}}
tellraw @a {"text":"Зло изгнано с поверхности.","color":"gray"}
scoreboard players set gamerule gamerule_safe_surface 1
execute in minecraft:overworld as @e[type=#main:mundane_hostiles] at @s run function main:mechanic/spawn_mechanic/safe_surface
