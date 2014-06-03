
#import "QMAPoi+Create.h"
#import "QMATarget.h"

@implementation QMAPoi (Create)

+ (QMAPoi *)poiWithLabel:(NSString *)label
          andColorNumber:(NSNumber *)color
            andImageName:(NSString *)imageName
            andAudioName:(NSString *)audioName
               forTarget:(QMATarget *)target
  inManagedObjectContext:(NSManagedObjectContext *)moc {
    
    QMAPoi *poi;
    
    NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"QMAPoi"];
    request.predicate = [NSPredicate predicateWithFormat:@"target = %@ AND label = %@", target, label];
    NSArray *matches = [moc executeFetchRequest:request error:nil];
    
    if (!matches) {
        QMALog(@"Error: Fetch request failed");
    } else if ([matches count] > 1) {
        QMALog(@"Error: More than one POI with the name '%@' for target '%@'", label, target.label);
    } else if ([matches count] == 1) {
        QMALog(@"A POI named '%@' already exists for target '%@'. Update it's properties.", label, target.label);
        poi = [matches firstObject];
    } else {
        poi = [NSEntityDescription insertNewObjectForEntityForName:@"QMAPoi"
                                            inManagedObjectContext:moc];
        poi.label = label;
    }
    
    poi.color = color;
    poi.image = imageName;
    poi.audio = audioName;
    
    return poi;
}

- (NSString *)description {
    return [NSString stringWithFormat:@"<%@: %p, %@>", [self class], self, @{@"Label":self.label, @"Color":self.color, @"Image Name":self.image}];
}

@end
