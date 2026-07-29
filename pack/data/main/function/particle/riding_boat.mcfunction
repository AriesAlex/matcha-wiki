execute as @a[scores={boating=12..}] at @s if block ~ ~-.1 ~ water on vehicle at @s run particle minecraft:splash ^0.75 ^.5 ^1 .1 .1 .1 1 3
execute as @a[scores={boating=12..}] at @s if block ~ ~-.1 ~ water on vehicle at @s run particle minecraft:splash ^-0.75 ^.5 ^1 .1 .1 .1 1 3
execute as @a[scores={boating=12..}] at @s if block ~ ~-.1 ~ water on vehicle at @s run particle minecraft:splash ^ ^.5 ^-1.1 .25 .1 .25 1 10
execute as @a[scores={boating=12..}] at @s if block ~ ~-.1 ~ water on vehicle at @s run particle minecraft:sulfur_bubbles ^-0.75 ^.5 ^-1 .1 .1 .1 0 3
execute as @a[scores={boating=12..}] at @s if block ~ ~-.1 ~ water on vehicle at @s run particle minecraft:sulfur_bubbles ^0.75 ^.5 ^-1 .1 .1 .1 0 3
execute as @a[scores={boating=1..}] at @s if block ~ ~-.1 ~ water on vehicle at @s run particle minecraft:splash ^0.75 ^.1 ^1 .1 .1 .1 0.1 1
execute as @a[scores={boating=1..}] at @s if block ~ ~-.1 ~ water on vehicle at @s run particle minecraft:splash ^-0.75 ^.1 ^1 .1 .1 .1 0.1 1
scoreboard players set @a[scores={boating=1..}] boating 0
