from random import random

vowels = 'aeiou'
consonants = 'bcdfghjklmnpqrstvwxyz'


def randname(length):
    name = ""
    for i in range(length):
        if i % 2:
            name += vowels[int(random() * len(vowels))]
        else:
            name += consonants[int(random() * len(consonants))]
    return name.capitalize()
