execute as @e[type=minecraft:armor_stand,tag=WardingStone] at @s run particle minecraft:soul_fire_flame ~ ~0.5 ~ .5 .5 .5 0 1
execute as @e[type=minecraft:armor_stand,tag=WardingStone] at @s run effect give @e[type=#minecraft:undead,distance=..26] minecraft:slowness 2 1 true
scoreboard players add @e[type=minecraft:armor_stand,tag=WardingStone] warding_stone_cooldown 0
scoreboard players remove @e[type=minecraft:armor_stand,tag=WardingStone,scores={warding_stone_cooldown=1..}] warding_stone_cooldown 1
execute as @e[type=minecraft:armor_stand,tag=WardingStone,scores={warding_stone_cooldown=0}] at @s run function main:mechanic/warding_stone_pulse
