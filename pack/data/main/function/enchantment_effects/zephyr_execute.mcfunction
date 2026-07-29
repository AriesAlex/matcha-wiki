execute if score @s zephyr_charge matches 1.. run particle minecraft:gust ~ ~0.1 ~ 0.1 0 0.1 0 1
execute if score @s zephyr_charge matches 45.. run particle minecraft:poof ~ ~ ~ .1 .1 .1 .5 50
execute if score @s zephyr_charge matches 45.. run effect give @s minecraft:levitation 1 12
execute if score @s zephyr_charge matches 45.. run playsound minecraft:entity.wind_charge.wind_burst hostile @s ~ ~ ~ 2
scoreboard players set @s zephyr_charge 0
