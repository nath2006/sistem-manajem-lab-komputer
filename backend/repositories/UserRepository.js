import {Prisma} from '../prisma.js';

export class UserRepository {
  list(){
    return Prisma.user.findMany({
      select: {
        user_id: true, username: true, nama_lengkap: true,
        email: true, role:true
      },
      orderBy: {user_id: 'asc'}
    });
  }

  getById(id){
    return Prisma.user.findUnique({
      where: {user_id: id},
      select: {
        user_id: true, username: true, nama_lengkap: true,
        email: true, role: true, is_online: true
      }
    });
  }


  //untuk login
  getWithPassword(id){
    return Prisma.user.findUnique({
      where: {user_id: Number(id)},
    })
  }
  getUsernameOrEmail(username, email){
    return Prisma.user.findFirst({
      where: {
        OR: [{username}, {email}],
        select: {user_id: true, username: true, email:true}
      }
    });
  }


  create(data){
    return Prisma.user.create({data, select: {
      user_id: true, username: true, nama_lengkap: true,
      email: true, role: true, is_online: true,
    }});
  }


  update(id, data){
    return Prisma.user.update({
      where: {user_id: Number(id)},
      data,
      select: {
        user_id: true, username: true, nama_lengkap: true,
        email: true, role: true, is_online: true
      }
    })
  }

  async remove(id) {
      await Prisma.user.delete({ where: { user_id: Number(id) } });
  }

  // cek relasi kepala lab
  findLabByKepala(userId) {
    return Prisma.laboratorium.findFirst({
      where: { kepala_lab_id: Number(userId) },
      select: { lab_id: true, nama_lab: true }
    });
  }

}
