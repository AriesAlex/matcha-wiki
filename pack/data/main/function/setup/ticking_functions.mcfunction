function main:mechanic/sleep
function main:mechanic/manage_hunger
function main:mechanic/water_bottle_stacking
function main:mechanic/warding_stone
function main:mechanic/spawn_mechanic/ticking
function main:mechanic/remove_xp
function main:mechanic/anvil_xp
function main:mechanic/hpdown
execute as @a at @s run function main:enchantment_effects/warding_armour
execute as @a at @s run function main:enchantment_effects/divinity
execute as @a unless entity @s[nbt={equipment:{feet:{components:{"minecraft:enchantments":{"main:zephyr":1}}}}}] run scoreboard players set @s zephyr_charge 0
function main:environmental/check_freezing_water_conditions
function main:particle/divine_favour_falling
function main:particle/riding_boat
function main:stopwatches
function main:environmental/village_eerie_sound
