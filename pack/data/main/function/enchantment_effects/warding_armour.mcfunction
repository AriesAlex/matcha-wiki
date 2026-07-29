scoreboard players set @s apotropaic 0
execute if entity @s[nbt={equipment:{head:{components:{"minecraft:enchantments":{"main:warding_armour":1}}}}}] run scoreboard players add @s apotropaic 1
execute if entity @s[nbt={equipment:{chest:{components:{"minecraft:enchantments":{"main:warding_armour":1}}}}}] run scoreboard players add @s apotropaic 1
execute if entity @s[nbt={equipment:{legs:{components:{"minecraft:enchantments":{"main:warding_armour":1}}}}}] run scoreboard players add @s apotropaic 1
execute if entity @s[nbt={equipment:{feet:{components:{"minecraft:enchantments":{"main:warding_armour":1}}}}}] run scoreboard players add @s apotropaic 1
execute if score @s apotropaic matches 0 run scoreboard players set @s warding_cooldown 0
execute if score @s warding_cooldown matches 1.. run scoreboard players remove @s warding_cooldown 1
execute if score @s warding_cooldown matches 0 if score @s apotropaic matches 1 run function main:enchantment_effects/warding1
execute if score @s warding_cooldown matches 0 if score @s apotropaic matches 1 run scoreboard players set @s warding_cooldown 10
execute if score @s warding_cooldown matches 0 if score @s apotropaic matches 2 run function main:enchantment_effects/warding2
execute if score @s warding_cooldown matches 0 if score @s apotropaic matches 2 run scoreboard players set @s warding_cooldown 20
execute if score @s warding_cooldown matches 0 if score @s apotropaic matches 3 run function main:enchantment_effects/warding2
execute if score @s warding_cooldown matches 0 if score @s apotropaic matches 3 run scoreboard players set @s warding_cooldown 10
execute if score @s warding_cooldown matches 0 if score @s apotropaic matches 4 run function main:enchantment_effects/warding3
execute if score @s warding_cooldown matches 0 if score @s apotropaic matches 4 run scoreboard players set @s warding_cooldown 20
