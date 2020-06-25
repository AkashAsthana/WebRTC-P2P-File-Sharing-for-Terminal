# P2P File Sharing with WebRTC

A P2P File Sharing Utility for the terminal built using WebRTC

#### What it does
It is a p2p file sharing command line utility built with WebRTC and Node.js. Though there is a need for a signalling server initially for the handshake, there are no servers involved in the transfer, the two machines are connected directly (p2p).
The best part about this is that you need to type just 1 command to send a file of ***any size*** to a person ***anywhere*** in the world. 

#### How to use
* First the sender needs to navigate to the directory where the file to be sent is present.
* Then the sender needs to start the script with the command ```node client s fileName``` where fileName is the file to be sent. A key for the transfer session will be generated. The sender needs to share the key to the reciever by any method.
* Then the reciever will navigate to the directory where the incoming file will be recieved, then run the command ```node client r key``` where key is the session key recieved from the sender.


Even though the application is complete there is a lot more that can e done to improve it. Feel free to contribute.

    
