execute as @a store result score @s sleepTimerScore run data get entity @s SleepTimer
execute if entity @a[scores={sleepTimerScore=1..99}] run time add 120
