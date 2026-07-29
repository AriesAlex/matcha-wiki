execute if score @s zephyr_charge matches ..44 run scoreboard players add @s zephyr_charge 1
execute if score @s zephyr_charge matches 45 run particle minecraft:dust_plume ~ ~ ~ .5 .1 .5 .1 50
execute if score @s zephyr_charge matches 45 run playsound minecraft:entity.experience_orb.pickup player @s ~ ~ ~ 0.75
execute if score @s zephyr_charge matches 45 run scoreboard players set @s zephyr_charge 46
