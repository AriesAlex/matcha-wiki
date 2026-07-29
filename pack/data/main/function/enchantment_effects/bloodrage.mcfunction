execute if score @s HealthPoints matches ..10 run title @s actionbar {"bold":false,"color":"red","translate":"message.kleispack.bloodrage"}
execute if score @s HealthPoints matches ..10 run effect give @s minecraft:resistance 1 1 true
execute if score @s HealthPoints matches ..10 run effect give @s minecraft:strength 1 0 true
execute at @s if score @s HealthPoints matches ..10 run particle dust{color:[1.000,0.000,0.000],scale:1} ~ ~1.5 ~ .25 .25 .25 .1 1 normal
