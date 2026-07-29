scoreboard objectives add zephyr_charge dummy
scoreboard players add @a zephyr_charge 0

scoreboard objectives add Hunger food

scoreboard objectives add HealthPoints health
scoreboard objectives add deaths deathCount
scoreboard objectives add Hearts dummy
scoreboard players add @a Hearts 0
scoreboard players set @a[scores={Hearts=..20}] Hearts 20


scoreboard objectives add sleepTimerScore dummy
scoreboard players add @a sleepTimerScore 0

scoreboard objectives add divinity dummy
scoreboard objectives add divinity_cooldown dummy
scoreboard players add @a divinity 0
scoreboard players add @a divinity_cooldown 0
scoreboard objectives add apotropaic dummy
scoreboard objectives add warding_cooldown dummy
scoreboard players add @a apotropaic 0
scoreboard players add @a warding_cooldown 0
scoreboard objectives add warding_stone_cooldown dummy

stopwatch create 3s
stopwatch create 0.5s
stopwatch create eerie

scoreboard objectives add eerie dummy
scoreboard players set 1 eerie 1

scoreboard objectives add boating minecraft.custom:minecraft.boat_one_cm

scoreboard objectives add anvil_interaction minecraft.custom:minecraft.interact_with_anvil
scoreboard objectives add anvil_xp_timer dummy
scoreboard players add @a anvil_interaction 0
scoreboard players add @a anvil_xp_timer 0

scoreboard objectives add gamerule_safe_surface dummy

scoreboard objectives add motion_x1 dummy
scoreboard objectives add motion_x2 dummy
scoreboard objectives add motion_y1 dummy
scoreboard objectives add motion_y2 dummy
scoreboard objectives add motion_z1 dummy
scoreboard objectives add motion_z2 dummy
