scoreboard players set @s divinity 0
execute if entity @s[nbt={SelectedItem:{components:{"minecraft:enchantments":{"main:divinity":1}}}}] run scoreboard players add @s divinity 1
execute if entity @s[nbt={equipment:{head:{components:{"minecraft:enchantments":{"main:divinity":1}}}}}] run scoreboard players add @s divinity 1
execute if entity @s[nbt={equipment:{chest:{components:{"minecraft:enchantments":{"main:divinity":1}}}}}] run scoreboard players add @s divinity 1
execute if entity @s[nbt={equipment:{legs:{components:{"minecraft:enchantments":{"main:divinity":1}}}}}] run scoreboard players add @s divinity 1
execute if entity @s[nbt={equipment:{feet:{components:{"minecraft:enchantments":{"main:divinity":1}}}}}] run scoreboard players add @s divinity 1
execute if score @s divinity matches 0 run scoreboard players set @s divinity_cooldown 0
execute if score @s divinity_cooldown matches 1.. run scoreboard players remove @s divinity_cooldown 1
execute if score @s divinity_cooldown matches 0 if score @s divinity matches 1 run effect give @s minecraft:absorption 30 0 true
execute if score @s divinity_cooldown matches 0 if score @s divinity matches 2 run effect give @s minecraft:absorption 30 1 true
execute if score @s divinity_cooldown matches 0 if score @s divinity matches 3 run effect give @s minecraft:absorption 30 2 true
execute if score @s divinity_cooldown matches 0 if score @s divinity matches 4 run effect give @s minecraft:absorption 30 3 true
execute if score @s divinity_cooldown matches 0 if score @s divinity matches 5 run effect give @s minecraft:absorption 15 4 true
execute if score @s divinity_cooldown matches 0 if score @s divinity matches 1..4 run scoreboard players set @s divinity_cooldown 600
execute if score @s divinity_cooldown matches 0 if score @s divinity matches 5 run scoreboard players set @s divinity_cooldown 300
