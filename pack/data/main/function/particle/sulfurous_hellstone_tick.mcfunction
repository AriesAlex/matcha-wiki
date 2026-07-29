execute as @a[tag=SulfurParticles] at @s if block ~ ~-.1 ~ minecraft:nether_quartz_ore run particle minecraft:noxious_gas ~ ~.1 ~ .5 0 .5 0 1
execute as @a[tag=SulfurParticles] at @s unless block ~ ~-.1 ~ minecraft:nether_quartz_ore run tag @s remove SulfurParticles
execute if entity @a[tag=SulfurParticles] run schedule function main:particle/sulfurous_hellstone_tick 3t replace
