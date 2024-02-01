
# Status Codes fot the Braun Atelier R4 & CC4

Below is a collection of status codes supported by the Atelier R4 and CC4.

## Baudrate

The port's baudrate needs to be set to `300`.

## General

| Function                      | Code Sequence |
|-------------------------------|---------------|
| `CC4_OnOff`                   | `0<2`         |
| `CC4_Volume+`                 | `0<3`         |
| `CC4_Volume-`                 | `0<4`         | 
| `CC4_Mute`                    | `0<5`         |     
| `CC4_BalanceL`                | `0;;`         |     
| `CC4_BalanceR`                | `0;:`         |  
| `CC4_Treble+`                 | `0;@`         |     
| `CC4_Treble-`                 | `0;?`         |
| `CC4_Prog+`                   | `098`         |     
| `CC4_Prog-`                   | `097`         |
| `CC4_Dash`                    | `091`         |     
| `CC4_One`                     | `096`         |     
| `CC4_Two`                     | `095`         |     
| `CC4_Three`                   | `094`         |
| `CC4_Four`                    | `093`         |     
| `CC4_Five`                    | `092`         |     
| `CC4_Six`                     | `09>`         |     
| `CC4_Seven`                   | `09=`         |     
| `CC4_Eight`                   | `09<`         |     
| `CC4_Nine`                    | `09;`         |     
| `CC4_Zero`                    | `09:`         |   
| `CC4_Tape1`                   | `09?`         |     
| `CC4_Tape2`                   | `09@`         |     
| `CC4_Memo`                    | `099`         |  
| `CC4_MemoCheck`               | `0:1`         |     
| `CC4_FF`                      | `0:2`         |
| `CC4_Rew`                     | `0:3`         | 
| `CC4_Stop`                    | `0:4`         |     
| `CC4_Pause`                   | `0:5`         |
| `CC4_Start`                   | `0:6`         |     
| `CC4_XmitStat`, **see below** | `0:7`         |     
| `CC4_LBass`                   | `0:8`         |     
| `CC4_HBlend`                  | `0:9`         |     
| `CC4_Reset`                   | `0::`         |     
| `CC4_Set`                     | `0:;`         |     
| `CC4_Space`                   | `0:=`         |     
| `CC4_Record`                  | `0:>`         |     
| `CC4_ManTune+`                | `0:@`         |    
| `CC4_ManTune-`                | `0:?`         |   
| `CC4_BassCenter+`             | `0;1`         |    
| `CC4_BassCenter-`             | `0;!`         |  
| `CC4_Speaker`                 | `0;2`         |     
| `CC4_Control`                 | `0;3`         |     
| `CC4_Mono`                    | `0;4`         |     
| `CC4_Process`                 | `0;5`         |     
| `CC4_SourceTwo`               | `0;6`         |     
| `CC4_Bass+`                   | `0;8`         | 
| `CC4_Bass-`                   | `0;7`         |      
| `CC4_Loudness`                | `0;>`         |  
| `CC4_SubFilter`               | `0<1`         |     
| `CC4_Eq`                      | `0<6`         |   
| `CC4_Am`                      | `0<9`         |     
| `CC4_Tape`                    | `0<:`         |     
| `CC4_Tv`                      | `0<;`         |     
| `CC4_Fm`                      | `0<<`         |     
| `CC4_Phono`                   | `0<=`         |     
| `CC4_Cd`                      | `0<>`         |     
| `CC4_Speaker1`                | `0<?`         |     
| `CC4_Speaker2`                | `0<@`         |

Balance, volume, treble, etc. are special. When the command is used for the first time, it needs to be sent twice: When the first command is received, the receiver starts to display the corresponding number on its internal display, and only increments/decrements when receiving the second command.

## Status

**Not supported by R4/2 and CC4/2 due to a different processor!**

| Function       | Code Sequence |
|----------------|---------------|    
| `CC4_XmitStat` | `0:7`         |

The response consists of multiple lines. Information about the different statuses are encoded with numbers:

| Explanation       | No   | Example              |
|-------------------|------|----------------------|
| Start of status   | `0`  | `;0 <CR> <LF>`       |
| Volume Level      | `1`  | `;1;12 <CR> <LF>`    |
| Balance Level     | `2`  | `;2;L4; <CR> <LF>`   |
| Treble Level      | `3`  | `;3;+8 <CR> <LF>`    |
| Bass Level        | `4`  | `;4;-2 <CR> <LF>`    |
| Loudness          | `5`  | `;5;Y <CR> <LF>`     |
| Mute              | `6`  | `;6;N <CR> <LF>`     |
| Listen source     | `7`  | `;7;CD<CR> <LF>`     |
| Speaker 1         | `8`  | `;8;Y <CR> <LF>`     |
| Speaker 2         | `9`  | `;9;N <CR> <LF>`     |
| Station Frequency | `10` | `;10;89.7 <CR> <LF>` |

In general, values correspond to what is displayed by the device, while `Y` and `N` indicate active and inactive.
Possible values for `Listen source` are `TV`, `CD`, `PH`, `T1`, `T2`, `AM`, `FM`.

## CD Player

Control a CD-Player if connected to the receiver.

### CD4/2, CD2/3, CD5
| Function    | Code Sequence |
|-------------|---------------|
| `CD_Skip`   | `02:`         |      
| `CD_FF`     | `022`         |  
| `CD_Rew`    | `023`         |    
| `CD_Return` | `024`         |     
| `CD_Pause`  | `025`         |     
| `CD_Start`  | `026`         |     

### CD2/3, CD5
| Function    | Code Sequence |
|-------------|---------------|
| `CD_Repeat` | `03=`         |     
| `CD_Time`   | `03<`         |     
| `CD_Set`    | `02=`         |     
| `CD_Goto`   | `02<`         |  

### CD5
| Function   | Code Sequence |
|------------|---------------|
| `CD_AB`    | `03=`         |     
| `CD_Clear` | `03<`         |     
| `CD_One`   | `016`         |     
| `CD_Two`   | `015`         |     
| `CD_Three` | `014`         |     
| `CD_Four`  | `013`         |     
| `CD_Five`  | `012`         |     
| `CD_Six`   | `01>`         |     
| `CD_Seven` | `01=`         |     
| `CD_Eight` | `01<`         |     
| `CD_Nine`  | `01;`         |    
| `CD_Zero`  | `01:`         | 