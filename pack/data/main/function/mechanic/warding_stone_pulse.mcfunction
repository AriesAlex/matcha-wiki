execute as @n[type=#minecraft:undead,type=!wither,distance=..24] at @s run particle minecraft:soul_fire_flame ~ ~2 ~ .25 .25 .25 .025 1
damage @n[type=#minecraft:undead,type=!wither,distance=..24] 7 minecraft:out_of_world
execute as @n[type=wither,distance=..24] at @s run particle minecraft:soul_fire_flame ~ ~2.5 ~ 1 1 1 .5 2
damage @n[type=wither,distance=..24] 2 minecraft:out_of_world
scoreboard players set @s warding_stone_cooldown 10
