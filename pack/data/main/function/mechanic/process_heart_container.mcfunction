execute if entity @s[scores={Hearts=60..}] run advancement revoke @s only main:mechanics/heart_container_obtained
execute if entity @s[scores={Hearts=..58}] run function main:mechanic/clear_heart_container
