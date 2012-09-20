jsSHA2 - OpenSource JavaScript implementation of the Secure Hash Algorithms,
         SHA-256-384-512 - http://anmar.eu.org/projects/jssha2/

Introduction
--------------------------------

jsSHA2 is an OpenSource JavaScript implementation of the Secure Hash Algorithm,
SHA-256-384-512. As defined by NIST: 

'All of the algorithms are iterative, one-way hash functions that can process a
message to produce a condensed representation called a message digest. These 
algorithms enable the determination of a message’s integrity: any change to the 
message will, with a very high probability, result in a different message digest. 
This property is useful in the generation and verification of digital signatures 
and message authentication codes, and in the generation of random numbers (bits)'

File description
--------------------------------

sha2.js:
 Full implementation, it gives the hash as a string, base64 encoded or hex encoded.

sha256.js:
 Is a stripped down version for using only SHA-256 in web based apps. It only gives
 hex output.


Features
--------------------------------

There is a working implementation of SHA-256.

Instructions
--------------------------------

Reference the appropriate file from your page:

<script type="text/javascript" src="sha256.js"></script>

Then, use it:

<script language="JavaScript">
  hash = hex_sha256("test string");
</script>

Authors
--------------------------------

 - Angel Marin <anmar at gmx.net> - http://anmar.eu.org/


License
--------------------------------

 - Read the included license.txt

--------------------------------
Angel Marin 2003 - 2004 - http://anmar.eu.org/
