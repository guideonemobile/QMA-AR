
#import "QMAPoi.h"


@interface QMAPoi (Create)

+ (QMAPoi *)poiWithName:(NSString *)name
         andColorNumber:(NSNumber *)order
 inManagedObjectContext:(NSManagedObjectContext *)moc;

@end
