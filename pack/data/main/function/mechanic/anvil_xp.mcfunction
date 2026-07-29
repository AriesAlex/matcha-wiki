execute as @a[scores={anvil_xp_timer=1..}] run scoreboard players remove @s anvil_xp_timer 1
execute as @a[scores={anvil_xp_timer=0}] run tag @s remove ExcludeFromXPRemoval
execute as @a[scores={anvil_interaction=1..}] at @s run function main:mechanic/set_xp
