# Word list

`eff_large_wordlist.txt` is the Electronic Frontier Foundation's long word list: 7776 words, one for each combination of five dice. It is meant to be easier to memorize than the original Diceware list.

- **Author and license:** © Electronic Frontier Foundation, [Creative Commons Attribution 3.0 US](https://creativecommons.org/licenses/by/3.0/us/). Included unmodified. The rest of the project is MIT licensed.
- **Source:** https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt
- **SHA-256:** `addd35536511597a02fa0a9ff1e5284677b8883b83e986e43f15a3db996b903e` (PowerShell prints it in uppercase). The author downloaded the list from eff.org and found it identical to other copies they compared.

Check the fingerprint:

    Windows:  Get-FileHash wordlists\eff_large_wordlist.txt -Algorithm SHA256
    Linux:    sha256sum wordlists/eff_large_wordlist.txt

## Do you need exactly this list?

No. The entropy of a passphrase depends only on the **number of unique words** in the list (n · log2 W), not on which words they are. You can use another list (one word per line, or the Diceware format `11111<TAB>word`): the tool rejects duplicates and prints the SHA-256 of the list it used. The provenance of this list helps you detect corruption and gives you words chosen to be easy to memorize.

`npm test` checks this list: 7776 lines, dice codes 11111 to 66666, unique words, and no ambiguity with `-` or a space as separator. With 7776 words each word is worth 12.92 bits, and 10 words give 129.25 bits.

On Windows, `.gitattributes` stops Git from converting this file's line endings, which would change its hash.
