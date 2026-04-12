var targetBps = 7; 
var currentBps = 0;
var acceleration = 0.45; 
var friction = 0.92; 
var braking = false;
var vagonetas = [];

function chatHook(text) {
    var msg = text.toLowerCase().split(" ");
    if (msg[0] === "/velocity") {
        preventDefault();
        if (!msg[1]) {
            clientMessage("§e[Vagoneta] §fVelocidad actual: §b" + targetBps + " bps");
            return;
        }
        var input = parseFloat(msg[1]);
        if (!isNaN(input) && input > 0) {
            targetBps = input;
            clientMessage("§e[Vagoneta] §fVelocidad fijada: §a" + targetBps + " bps");
        }
    }
}

function entityHurtHook(attacker, victim, halfhearts) {
    if (Entity.getEntityTypeId(victim) == 84 && attacker != getPlayerEnt()) {
        preventDefault();
    }
}

function entityAddedHook(ent) {
    if (Entity.getEntityTypeId(ent) == 84) vagonetas.push(ent);
}

function modTick() {
    var px = getPlayerX(), py = getPlayerY(), pz = getPlayerZ();
    var miVagoneta = -1;

    for (var i = vagonetas.length - 1; i >= 0; i--) {
        try {
            var c = vagonetas[i];
            if (Math.abs(px - Entity.getX(c)) < 1.3 && Math.abs(pz - Entity.getZ(c)) < 1.3) {
                miVagoneta = c;
                break;
            }
        } catch(e) { vagonetas.splice(i, 1); }
    }

    if (miVagoneta !== -1) {
        var yaw = getYaw();
        var pitch = getPitch();
        
        if (pitch > 65) { 
            braking = true;
            currentBps *= friction;
            if (currentBps < 0.2) currentBps = 0;
        } else { 
            braking = false;
            if (currentBps < targetBps) currentBps += acceleration;
            else if (currentBps > targetBps) currentBps -= acceleration;
        }

        if (currentBps > 0) {
            var avance = currentBps / 20; 
            var vx = -Math.sin(yaw / 180 * Math.PI) * avance;
            var vz = Math.cos(yaw / 180 * Math.PI) * avance;
            
            var ex = Entity.getX(miVagoneta), ey = Entity.getY(miVagoneta), ez = Entity.getZ(miVagoneta);
            
            var nextX = ex + vx;
            var nextZ = ez + vz;
            var nextY = ey;

            var bInside = Level.getTile(Math.floor(nextX), Math.floor(ey + 0.2), Math.floor(nextZ));
            var bUnder = Level.getTile(Math.floor(nextX), Math.floor(ey - 0.2), Math.floor(nextZ));

            if (bInside !== 0) {
                // Step Assist: Sube el bloque
                nextY = Math.floor(ey) + 1.5;
            } else if (bUnder !== 0) {
                nextY = Math.floor(ey - 0.2) + 1.15;
            } else {
                // Caída si hay un agujero
                nextY -= 0.4;
            }

            Entity.setPosition(miVagoneta, nextX, nextY, nextZ);
            Entity.setVelY(miVagoneta, 0); // Anulamos la gravedad residual de MCPE

            var hitMob = false;
            var damage = Math.floor((currentBps / 10) * 10); // 10 de daño por cada 10 bps

            try {
                var entities = Entity.getAll();
                for (var n = 0; n < entities.length; n++) {
                    var victim = entities[n];
                    var type = Entity.getEntityTypeId(victim);
                    
                    if (type >= 10 && type <= 63 && victim != getPlayerEnt() && victim != miVagoneta) {
                        var dx = Entity.getX(victim) - ex;
                        var dz = Entity.getZ(victim) - ez;
                        var dist = Math.sqrt(dx*dx + dz*dz);
                        
                        if (dist < 1.5 && Math.abs(Entity.getY(victim) - ey) < 1.5 && damage > 0) {
                            Entity.setHealth(victim, Entity.getHealth(victim) - damage);
                            Entity.setVelX(victim, vx * 2);
                            Entity.setVelY(victim, 0.4); // Los lanza hacia arriba por el impacto
                            Entity.setVelZ(victim, vz * 2);
                            hitMob = true; // Marcamos que hubo un impacto real
                        }
                    }
                }
            } catch(error) {
            }

            if (hitMob) {
                ModPE.showTipMessage("§c§l[ ATROPELLAR ]\n§fDaño: §e" + damage + " HP");
            } else {
                var vReal = currentBps.toFixed(1);
                var tag = braking ? "§c§l[ FRENANDO ]" : (currentBps < targetBps - 0.5 ? "§e§l[ ACELERANDO ]" : "§a§l[ VELOCIDAD MAXIMA ]");
                ModPE.showTipMessage(tag + "\n§fV: §b" + vReal + " bps");
            }
        }
    } else {
        currentBps = 0;
    }
}
