execute unless entity @s[nbt={active_effects:[{id:"minecraft:unluck"}]}] at @s anchored eyes run summon wind_charge ^ ^ ^.75 {Tags:["motion_projectile"]}
execute unless entity @s[nbt={active_effects:[{id:"minecraft:unluck"}]}] rotated as @s at @s anchored eyes positioned ^ ^ ^.75 as @n[type=minecraft:wind_charge,tag=motion_projectile,distance=..1] positioned as @s run function main:backend/apply_motion
execute unless entity @s[nbt={active_effects: [{id: "minecraft:unluck"}]}] run effect give @s unluck 1 0 false
