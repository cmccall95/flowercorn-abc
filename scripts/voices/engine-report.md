# In-app voice check

Voice loaded in 8s on the build machine; 106 lines took 2.96s each on average (max 4.71s).

Listened with Whisper: 42 of 106 letter lines named the right letter.

## Ways of saying a letter name

| language | way | heard right | missed |
|---|---|---|---|
| en | bang | 11 of 26 | A (“They.”), B (“Buh-bye.”), E (“Lee.”), F (“enough”), G (“Adjie”), H (“Later.”), I (“Bye.”), L (“Now.”), M (“them”), N (“And...”), O (“I know.”), Q (“Thank you.”), R (“Alar”), S (“Yes.”), T (“See you.”) |
| en | pause | 16 of 26 | E (“As ye.”), F (“Left.”), H (“Age.”), K (“Okay.”), M (“XM”), N (“The end.”), O (“Hello.”), P (“Applié.”), Q (“Thank you.”), S (“Yes.”) |
| en | plain | 13 of 26 | A (“Nay.”), E (“Lee.”), F (“left”), H (“Nate.”), I (“Zai.”), K (“Okay.”), L (“Now.”), M (“Them.”), N (“And...”), O (“No.”), Q (“Thank you.”), R (“Alar.”), T (“I see.”) |
| en | twice | 23 of 26 | E (“I leave here.”), H (“HH.”), S (“An SS.”) |
| es | bang | 1 of 27 | A (“Ya.”), B (“Best.”), C (“...síen.”), D (“Déjame.”), E (“De esto.”), F (“¡Nefen!”), G (“¡Nos vemos!”), H (“¡Gracias!”), I (“Adios.”), J (“¿Y por qué?”), K (“Híjole.”), L (“¡Tvelle!”), M (“¡Déma eh!”), N (“¡Ve, net!”), Ñ (“¡Deñe!”), O (“No, es que...”), P (“...el baile.”), Q (“Me cago.”), R (“¡De re!”), S (“Besley.”), T (“¡Adiós!”), U (“¡Suscríbete!”), V (“¡Número!”), W (“Tuve doble.”), X (“Le quiso.”), Y (“”) |
| es | pause | 1 of 27 | A (“de”), B (“Abed.”), C (“I'll say”), D (“Adé...”), E (“”), F (“¡En efecto!”), G (“Gracias.”), H (“¡Ladre!”), I (“Aleve.”), J (“Y otra vez.”), K (“¡Licado!”), L (“¿Dónde él leía?”), M (“De medo.”), N (“Usted es neto.”), Ñ (“¡Bleñe!”), O (“¡Nihanos!”), P (“No pero...”), Q (“¡Suscríbete!”), R (“¡Mierde!”), S (“Ok, sir.”), T (“¡Oye!”), U (“aduuu”), V (“¡Solo malo!”), W (“Suve doble.”), Y (“¡Oh, yeah!”), Z (“Y se está...”) |
| es | plain | 3 of 27 | A (“Ya.”), B (“Bad.”), E (“”), F (“¡Nefe!”), G (“Me sale.”), H (“¡Muchas gracias!”), I (“Anéis.”), J (“¿Y por qué?”), K (“¡Hickeld!”), L (“¡Vale!”), M (“¡Déjame!”), N (“¡Ven el!”), Ñ (“¡Deñe!”), O (“¿Qué tal?”), P (“He bailed.”), Q (“Thank you.”), R (“NERRE!”), S (“¡Vece!”), U (“”), V (“¡No veas!”), W (“¡Cube doble!”), X (“Alequis.”), Y (“¿Dónde?”), Z (“¡Se está!”) |
| es | twice | 5 of 27 | A (“¡Lazalic!”), B (“Best best.”), E (“That's it.”), F (“¡Nefen, efek!”), G (“Más el rey.”), H (“Nath Shea Ad Shea.”), I (“¡A mí en la hija!”), J (“Hotel, hotel.”), K (“¡Calz Calz!”), L (“¡Salud, Elliot!”), M (“¡Déjame esto, déjame esto!”), N (“¡Déneis, Enec!”), Ñ (“¿Eso es o no es?”), O (“no es...”), P (“¡Pespe!”), Q (“¡Que os coge!”), S (“¡Esle, esle!”), T (“¡Hotel Teo!”), U (“¡No es over!”), V (“¡No ves, no ves!”), X (“Lekis Aekis”), Y (“Yes, yes.”) |

| file | letter | heard | |
|---|---|---|---|
| en-A-name.wav | A | “Nay.” | ⚠️ |
| en-A-word.wav | A | “It is for Apple.” | ⚠️ |
| en-B-name.wav | B | “Baby.” | ⚠️ |
| en-B-word.wav | B | “B is for butterfly.” | ✅ |
| en-C-name.wav | C | “I see.” | ✅ |
| en-C-word.wav | C | “See is for cat.” | ✅ |
| en-D-name.wav | D | “D.” | ✅ |
| en-D-word.wav | D | “Diaz for dinosaur.” | ⚠️ |
| en-E-name.wav | E | “Lee.” | ⚠️ |
| en-E-word.wav | E | “Ye is for elephant.” | ⚠️ |
| en-F-name.wav | F | “left” | ⚠️ |
| en-F-word.wav | F | “F is for flower.” | ✅ |
| en-G-name.wav | G | “A G.” | ✅ |
| en-G-word.wav | G | “G is for JRAF.” | ✅ |
| en-H-name.wav | H | “Nate.” | ⚠️ |
| en-H-word.wav | H | “H is for heart.” | ✅ |
| en-I-name.wav | I | “Zai.” | ⚠️ |
| en-I-word.wav | I | “Eye is for ice cream.” | ✅ |
| en-J-name.wav | J | “A J.” | ✅ |
| en-J-word.wav | J | “J is for juice.” | ✅ |
| en-K-name.wav | K | “Okay.” | ⚠️ |
| en-K-word.wav | K | “K is for kitten.” | ✅ |
| en-L-name.wav | L | “Now.” | ⚠️ |
| en-L-word.wav | L | “Alley is for Ladybug.” | ⚠️ |
| en-M-name.wav | M | “Them.” | ⚠️ |
| en-M-word.wav | M | “M is for moon.” | ✅ |
| en-N-name.wav | N | “And...” | ⚠️ |
| en-N-word.wav | N | “And he's for nest.” | ⚠️ |
| en-O-name.wav | O | “No.” | ⚠️ |
| en-O-word.wav | O | “No ways for owl.” | ⚠️ |
| en-P-name.wav | P | “P.” | ✅ |
| en-P-word.wav | P | “P is for puppy.” | ✅ |
| en-Q-name.wav | Q | “Thank you.” | ⚠️ |
| en-Q-word.wav | Q | “Q is for Queen.” | ✅ |
| en-R-name.wav | R | “Alar.” | ⚠️ |
| en-R-word.wav | R | “R is for rainbow.” | ✅ |
| en-S-name.wav | S | “S.” | ✅ |
| en-S-word.wav | S | “S is for star.” | ✅ |
| en-T-name.wav | T | “I see.” | ⚠️ |
| en-T-word.wav | T | “T is for tulip.” | ✅ |
| en-U-name.wav | U | “You.” | ✅ |
| en-U-word.wav | U | “U is for unicorn.” | ✅ |
| en-V-name.wav | V | “a V” | ✅ |
| en-V-word.wav | V | “V is for violin.” | ✅ |
| en-W-name.wav | W | “W.” | ✅ |
| en-W-word.wav | W | “W is for whale.” | ✅ |
| en-X-name.wav | X | “X” | ✅ |
| en-X-word.wav | X | “X's for Xylophone.” | ✅ |
| en-Y-name.wav | Y | “Why?” | ✅ |
| en-Y-word.wav | Y | “Why is for yo-yo?” | ✅ |
| en-Z-name.wav | Z | “a z” | ✅ |
| en-Z-word.wav | Z | “Z is for zebra.” | ✅ |
| en-cheer.wav | — | “Great job, Charlotte.” | |
| es-A-name.wav | A | “Ya.” | ⚠️ |
| es-A-word.wav | A | “Adia, beija.” | ⚠️ |
| es-B-name.wav | B | “Bad.” | ⚠️ |
| es-B-word.wav | B | “B de pajena.” | ✅ |
| es-C-name.wav | C | “Un saludo.” | ⚠️ |
| es-C-word.wav | C | “Set de conejo.” | ⚠️ |
| es-D-name.wav | D | “de” | ✅ |
| es-D-word.wav | D | “de Dinosaurio.” | ✅ |
| es-E-name.wav | E | “” | ⚠️ |
| es-E-word.wav | E | “Vede estrella.” | ⚠️ |
| es-F-name.wav | F | “¡Nefe!” | ⚠️ |
| es-F-word.wav | F | “F de flor.” | ✅ |
| es-G-name.wav | G | “Me sale.” | ⚠️ |
| es-G-word.wav | G | “¡Que de gato!” | ⚠️ |
| es-H-name.wav | H | “¡Muchas gracias!” | ⚠️ |
| es-H-word.wav | H | “¡Haché de lado!” | ✅ |
| es-I-name.wav | I | “anéis” | ⚠️ |
| es-I-word.wav | I | “Sí, de Tijuana.” | ⚠️ |
| es-J-name.wav | J | “¿Y por qué?” | ⚠️ |
| es-J-word.wav | J | “¡Gotra de Xirafa!” | ⚠️ |
| es-K-name.wav | K | “Ikele.” | ⚠️ |
| es-K-word.wav | K | “Cádeco a la” | ⚠️ |
| es-L-name.wav | L | “¡Vale!” | ⚠️ |
| es-L-word.wav | L | “El de León” | ⚠️ |
| es-M-name.wav | M | “¡Déjame!” | ⚠️ |
| es-M-word.wav | M | “M de mariposa” | ✅ |
| es-N-name.wav | N | “¡Ven el!” | ⚠️ |
| es-N-word.wav | N | “¡Ena de nubes!” | ⚠️ |
| es-NY-name.wav | Ñ | “¡Deñe!” | ⚠️ |
| es-NY-word.wav | Ñ | “Señadeñando.” | ⚠️ |
| es-O-name.wav | O | “y no” | ⚠️ |
| es-O-word.wav | O | “¡Godeos!” | ⚠️ |
| es-P-name.wav | P | “He bailed.” | ⚠️ |
| es-P-word.wav | P | “Pede perro.” | ⚠️ |
| es-Q-name.wav | Q | “Me cago.” | ⚠️ |
| es-Q-word.wav | Q | “¡Cud de queso!” | ⚠️ |
| es-R-name.wav | R | “NERRE!” | ⚠️ |
| es-R-word.wav | R | “R de ratón” | ✅ |
| es-S-name.wav | S | “¡Vece!” | ⚠️ |
| es-S-word.wav | S | “S de sol.” | ✅ |
| es-T-name.wav | T | “Y te ayudo.” | ✅ |
| es-T-word.wav | T | “Sede tortuga.” | ⚠️ |
| es-U-name.wav | U | “” | ⚠️ |
| es-U-word.wav | U | “Zude Unicornio.” | ⚠️ |
| es-V-name.wav | V | “¡No veas!” | ⚠️ |
| es-V-word.wav | V | “Lluve de Baca.” | ⚠️ |
| es-W-name.wav | W | “¡Cube doble!” | ⚠️ |
| es-W-word.wav | W | “V doble de wafle.” | ⚠️ |
| es-X-name.wav | X | “Alequis.” | ⚠️ |
| es-X-word.wav | X | “Aquí es Dexilófono.” | ⚠️ |
| es-Y-name.wav | Y | “¿Dónde?” | ⚠️ |
| es-Y-word.wav | Y | “Ya deslludió.” | ⚠️ |
| es-Z-name.wav | Z | “¡Se está!” | ⚠️ |
| es-Z-word.wav | Z | “SETA DE SORO” | ✅ |
| es-cheer.wav | — | “Muy bien, Charlotte.” | |
