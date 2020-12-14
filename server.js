var SSH = require('simple-ssh');
var client = require('scp2')

var er = {
    sendFile: function(file, path) {
        return new Promise((resolve, reject) => {
            client.scp(file, {
                host: '192.168.1.1',
                username: 'ubnt',
                password: 'ubnt',
                path: path
            }, function(err) {
                if (err) {
                    reject(err)
                } else {
                    resolve()
                }
            })
        })
    },
    runCommand: function(callback) { //Creates the ssh session and returns output of command.
        var ssh = new SSH({
            host: '192.168.1.1',
            user: 'ubnt',
            pass: 'ubnt',
            timeout: 3000
        });

        var data = '';
        var error = null;

        ssh.exec('yes | /opt/vyatta/bin/vyatta-op-cmd-wrapper delete system image', {
            out: function(stdout) {
                data += stdout;
            },
            
            
            exit: function(code) {
                if (code != 0) {
                    return callback(new Error('exit code: ' + code), data);
                }
                console.log(data); 
            },
            err: function(err) {
                error = err;
                return callback(err) 
            }
        })
        .exec('yes | /opt/vyatta/bin/vyatta-op-cmd-wrapper add system image /home/ubnt/firmware.tar', {
            out: function(stdout) {
                data = '';
                data += stdout;
            },
            
            
            exit: function(code) {
                if (code != 0) {
                    return callback(new Error('exit code: ' + code), data);
                }
                console.log(data); 
            },
            err: function(err) {
                error = err;
                return callback(err) 
            }
        }).exec('nohup sudo reboot &>/dev/null & exit', {
            out: function(stdout) {
                data = '';
                data += stdout;
            },
            
            
            exit: function(code) {
                if (code != 0) {
                    return callback(new Error('exit code: ' + code), data);
                }
                //console.log(data);
                console.log('Router is rebooting...') 
            },
            err: function(err) {
                error = err;
                return callback(err) 
            }
        }).start({
            fail: function(err) {
                return callback(err) //Returns any connection error. (timeout, auth)
            }
        });
    },
    checkModel: function(callback) { //Creates the ssh session and returns output of command.
        var ssh = new SSH({
            host: '192.168.1.1',
            user: 'ubnt',
            pass: 'ubnt',
            timeout: 3000
        });

        var data = '';
        var error = null;

        ssh.exec('/opt/vyatta/bin/vyatta-op-cmd-wrapper show version', {
            out: function(stdout) {
                data += stdout;
            },
            exit: function(code) {
                if (code != 0) {
                    return callback(new Error('exit code: ' + code), data);
                }
                return callback(err, data) 
            },
            err: function(err, data) {
                error = err;
                return callback(err, data) 
            }
        }).start({
            fail: function(err, data) {
                return callback(err, data) //Returns any connection error. (timeout, auth)
            }
        });
    }
}




var provision = function(file, path) {
    return new Promise((resolve, reject) => { 
        (er.sendFile(file, path))
        .then(function() {
            er.runCommand(function(err) {
                if (err) {
                    console.log(err)
                }
            })
        })
    }
)}

const dostuff = function() {
    er.checkModel(function(err, data) {
        if (err) {
            console.log(new Error('Error: ' + err.level + ' Router unreachable.'))
        } else {
            if (data.includes('Lite')) {
                console.log('Working with an ER-Lite')
                er.sendFile('./files/erlite.config.boot', '/config/config.boot')
                provision('./files/ER-e100.v2.0.9.5346345.tar', '/home/ubnt/firmware.tar')
            } else if(data.includes('EdgeRouter 4')) {
                console.log('Working with an ER-4')
                er.sendFile('./files/er4.config.boot', '/config/config.boot')
                provision('./files/ER-e300.v2.0.9.5346345.tar', '/home/ubnt/firmware.tar')
            } else if(data.includes('EdgeRouter X SFP 6-Port')) {
                console.log('Working with an ER-X-SFP')
                er.sendFile('./files/erx.config.boot', '/config/config.boot')
                provision('./files/ER-e50.v2.0.9.5346345.tar', '/home/ubnt/firmware.tar')
            } else {
                console.log('No matching firmware.')
            }
        }
    })
}

dostuff()