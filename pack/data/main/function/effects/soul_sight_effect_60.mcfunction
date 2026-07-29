execute at @s run playsound minecraft:block.bell.resonate player @s ~ ~ ~ 2 1
execute at @s run effect give @e[distance=0.1..50] minecraft:glowing 60 0 true
advancement revoke @s only main:mechanics/glow_crumble_eaten
